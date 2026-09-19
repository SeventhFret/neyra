pub mod github;
pub mod gitlab;
pub mod models;

use crate::core::config::models::{ProviderConfig, ProviderType};

use models::MergeRequest;

pub async fn get_merge_requests(
    provider: &ProviderConfig,
    token: &str,
) -> Result<Vec<MergeRequest>, String> {
    match provider.provider_type {
        ProviderType::GitHub => github::get_merge_requests(&provider.host, token).await,
        ProviderType::GitLab => gitlab::get_merge_requests(&provider.host, token).await,
    }
}
