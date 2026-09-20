use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    #[serde(default)]
    pub providers: Vec<ProviderConfig>,
    pub git_flows: Vec<GitFlow>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderConfig {
    pub id: String,
    pub provider_type: ProviderType,
    pub host: String,

    #[serde(default)]
    pub username: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ProviderType {
    GitHub,
    GitLab,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitFlowStep {
    pub id: String,
    pub name: String,

    pub args: Vec<String>,

    pub stop_on_failure: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitFlow {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub steps: Vec<GitFlowStep>,
}
