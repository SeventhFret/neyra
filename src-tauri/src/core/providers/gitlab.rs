use std::collections::HashSet;

use gitlab::{
    api::{
        self,
        merge_requests::{
            MergeRequestScope, MergeRequestState as GitLabMergeRequestState, MergeRequests,
        },
        AsyncQuery, Pagination,
    },
    AsyncGitlab,
};
use serde::Deserialize;

use super::models::{MergeRequest, MergeRequestState, MergeStatus, ProviderUser};

#[derive(Debug, Deserialize)]
struct GitLabUser {
    username: String,
    name: Option<String>,
    avatar_url: Option<String>,
    web_url: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GitLabMergeRequestReferences {
    full: String,
}

#[derive(Debug, Deserialize)]
struct GitLabMergeRequest {
    id: u64,
    iid: u64,
    references: GitLabMergeRequestReferences,

    title: String,
    description: Option<String>,
    web_url: String,

    source_branch: String,
    target_branch: String,

    author: GitLabUser,

    #[serde(default)]
    reviewers: Vec<GitLabUser>,

    #[serde(default)]
    draft: bool,

    state: String,

    detailed_merge_status: Option<String>,

    created_at: String,
    updated_at: String,
}

pub async fn get_merge_requests(host: &str, token: &str) -> Result<Vec<MergeRequest>, String> {
    let host = normalize_host(host);

    let client = gitlab::Gitlab::builder(&host, token)
        .build_async()
        .await
        .map_err(|error| format!("Failed to connect to GitLab: {error}"))?;

    let authored = fetch_merge_requests(&client, MergeRequestScope::CreatedByMe)
        .await
        .map_err(|error| format!("Failed to fetch authored MRs: {error}"))?;

    let assigned = fetch_merge_requests(&client, MergeRequestScope::AssignedToMe)
        .await
        .map_err(|error| format!("Failed to fetch assigned MRs: {error}"))?;

    let mut seen = HashSet::new();
    let mut result = Vec::new();

    for request in authored.into_iter().chain(assigned) {
        if !seen.insert(request.id) {
            continue;
        }

        result.push(map_merge_request(request));
    }

    result.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));

    Ok(result)
}

async fn fetch_merge_requests(
    client: &AsyncGitlab,
    scope: MergeRequestScope,
) -> Result<Vec<GitLabMergeRequest>, String> {
    let endpoint = MergeRequests::builder()
        .state(GitLabMergeRequestState::Opened)
        .scope(scope)
        .build()
        .map_err(|error| error.to_string())?;

    api::paged(endpoint, Pagination::All)
        .query_async(client)
        .await
        .map_err(|error| error.to_string())
}

fn normalize_host(host: &str) -> String {
    host.trim_start_matches("https://")
        .trim_start_matches("http://")
        .trim_end_matches('/')
        .to_owned()
}

fn repository_from_reference(reference: &str) -> String {
    reference
        .rsplit_once('!')
        .map(|(repository, _)| repository)
        .unwrap_or(reference)
        .to_owned()
}

fn map_merge_request(request: GitLabMergeRequest) -> MergeRequest {
    let state = match request.state.as_str() {
        "merged" => MergeRequestState::Merged,
        "closed" => MergeRequestState::Closed,
        _ => MergeRequestState::Open,
    };

    let merge_status = map_merge_status(request.detailed_merge_status.as_deref());

    let repository = repository_from_reference(&request.references.full);

    MergeRequest {
        id: request.id,
        number: request.iid,

        repository,

        title: request.title,
        description: request.description,
        url: request.web_url,

        source_branch: request.source_branch,
        target_branch: request.target_branch,

        author: map_user(request.author),

        reviewers: request.reviewers.into_iter().map(map_user).collect(),

        draft: request.draft,

        state,
        merge_status,

        created_at: request.created_at,
        updated_at: request.updated_at,
    }
}
fn map_user(user: GitLabUser) -> ProviderUser {
    ProviderUser {
        username: user.username,
        display_name: user.name,
        avatar_url: user.avatar_url,
        profile_url: user.web_url,
    }
}

fn map_merge_status(status: Option<&str>) -> MergeStatus {
    match status {
        Some("mergeable") => MergeStatus::Mergeable,

        Some("conflict") => MergeStatus::Conflicts,

        Some("checking") | Some("unchecked") | Some("preparing") => MergeStatus::Checking,

        Some("not_approved")
        | Some("discussions_not_resolved")
        | Some("ci_must_pass")
        | Some("status_checks_must_pass")
        | Some("draft_status") => MergeStatus::Blocked,

        _ => MergeStatus::Unknown,
    }
}
