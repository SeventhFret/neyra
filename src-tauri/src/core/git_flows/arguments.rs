use super::models::GitFlowContext;

pub fn resolve_argument(argument: &str, context: &GitFlowContext) -> Result<String, String> {
    let mut result = argument.to_owned();

    result = result.replace("{{repositoryRoot}}", &context.repository_root);

    if result.contains("{{currentBranch}}") {
        let branch = context
            .current_branch
            .as_deref()
            .ok_or_else(|| "Cannot resolve {{currentBranch}}: HEAD is detached".to_owned())?;

        result = result.replace("{{currentBranch}}", branch);
    }

    Ok(result)
}

pub fn resolve_arguments(args: &[String], context: &GitFlowContext) -> Result<Vec<String>, String> {
    args.iter()
        .map(|arg| resolve_argument(arg, context))
        .collect()
}
