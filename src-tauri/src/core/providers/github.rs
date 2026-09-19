use std::collections::HashSet;

use octocrab::{
    models::{issues::Issue, pulls::PullRequest},
    Octocrab,
};

use super::models::{MergeRequest, MergeRequestState, MergeStatus, ProviderUser};

pub async fn get_merge_requests(host: &str, token: &str) -> Result<Vec<MergeRequest>, String> {
    let client = create_client(host, token)?;

    let current_user = client
        .current()
        .user()
        .await
        .map_err(|error| error.to_string())?;

    let username = current_user.login;

    // PRs created by the user + PRs assigned to the user.
    let queries = [
        format!("is:pr is:open author:{username}"),
        format!("is:pr is:open assignee:{username}"),
    ];

    let mut seen = HashSet::new();
    let mut result = Vec::new();

    for query in queries {
        let page = client
            .search()
            .issues_and_pull_requests(&query)
            .per_page(100)
            .send()
            .await
            .map_err(|error| error.to_string())?;

        let issues: Vec<Issue> = client
            .all_pages(page)
            .await
            .map_err(|error| error.to_string())?;

        for issue in issues {
            let (owner, repo) = parse_repository_url(&issue.repository_url.to_string())?;

            // owner/repo/#number is unique enough for our deduplication.
            let key = format!("{owner}/{repo}#{}", issue.number);

            if !seen.insert(key) {
                continue;
            }

            let pull = client
                .pulls(&owner, &repo)
                .get(issue.number)
                .await
                .map_err(|error| error.to_string())?;

            result.push(map_pull_request(pull));
        }
    }

    result.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));

    Ok(result)
}

fn create_client(host: &str, token: &str) -> Result<Octocrab, String> {
    let host = host.trim_end_matches('/');

    let github_com = matches!(
        host,
        "github.com" | "https://github.com" | "http://github.com"
    );

    let mut builder = Octocrab::builder().personal_token(token.to_owned());

    if !github_com {
        let base = if host.starts_with("http://") || host.starts_with("https://") {
            host.to_owned()
        } else {
            format!("https://{host}")
        };

        builder = builder
            .base_uri(format!("{base}/api/v3"))
            .map_err(|error| error.to_string())?;
    }

    builder.build().map_err(|error| error.to_string())
}

fn parse_repository_url(url: &str) -> Result<(String, String), String> {
    // Search results give us something like:
    //
    // https://api.github.com/repos/owner/repository
    //
    // or on GHES:
    //
    // https://github.company.com/api/v3/repos/owner/repository

    let marker = "/repos/";

    let (_, repository) = url
        .split_once(marker)
        .ok_or_else(|| format!("Could not parse GitHub repository URL: {url}"))?;

    let mut parts = repository.split('/');

    let owner = parts
        .next()
        .ok_or_else(|| format!("Missing GitHub repository owner: {url}"))?;

    let repo = parts
        .next()
        .ok_or_else(|| format!("Missing GitHub repository name: {url}"))?;

    Ok((owner.to_owned(), repo.to_owned()))
}

fn map_author(user: octocrab::models::Author) -> ProviderUser {
    ProviderUser {
        username: user.login,
        display_name: None,
        avatar_url: Some(user.avatar_url.to_string()),
        profile_url: Some(user.html_url.to_string()),
    }
}

fn map_pull_request(pull: PullRequest) -> MergeRequest {
    let author = pull
        .user
        .map(|user| map_author(*user))
        .unwrap_or_else(|| ProviderUser {
            username: "unknown".to_owned(),
            display_name: None,
            avatar_url: None,
            profile_url: None,
        });

    let reviewers = pull
        .requested_reviewers
        .unwrap_or_default()
        .into_iter()
        .map(map_author)
        .collect();

    let merge_status = match pull.mergeable {
        Some(true) => MergeStatus::Mergeable,
        Some(false) => MergeStatus::Conflicts,
        None => MergeStatus::Checking,
    };

    let state = if pull.merged_at.is_some() {
        MergeRequestState::Merged
    } else {
        match pull.state {
            Some(octocrab::models::IssueState::Closed) => MergeRequestState::Closed,

            _ => MergeRequestState::Open,
        }
    };

    MergeRequest {
        id: pull.id.0,
        number: pull.number,

        title: pull.title.unwrap_or_default(),
        description: pull.body,

        url: pull.html_url.map(|url| url.to_string()).unwrap_or_default(),

        source_branch: pull.head.ref_field,
        target_branch: pull.base.ref_field,

        author,
        reviewers,

        draft: pull.draft.unwrap_or(false),
        state,
        merge_status,

        created_at: pull
            .created_at
            .map(|date| date.to_rfc3339())
            .unwrap_or_default(),

        updated_at: pull
            .updated_at
            .map(|date| date.to_rfc3339())
            .unwrap_or_default(),
    }
}
