use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MergeRequest {
    pub id: u64,
    pub number: u64,

    pub title: String,
    pub description: Option<String>,
    pub url: String,

    pub source_branch: String,
    pub target_branch: String,

    pub author: ProviderUser,
    pub reviewers: Vec<ProviderUser>,

    pub draft: bool,
    pub state: MergeRequestState,

    pub merge_status: MergeStatus,

    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderUser {
    pub username: String,
    pub display_name: Option<String>,
    pub avatar_url: Option<String>,
    pub profile_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum MergeRequestState {
    Open,
    Closed,
    Merged,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum MergeStatus {
    Mergeable,
    Conflicts,
    Checking,
    Blocked,
    Unknown,
}
