use super::models::GitFlowContext;

pub fn find_unresolved_variable(value: &str) -> Option<&str> {
    let start = value.find("{{")?;
    let rest = &value[start + 2..];
    let end = rest.find("}}")?;

    Some(&rest[..end])
}

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

    if result.contains("{{remote}}") {
        let remote = context
            .remote
            .as_deref()
            .ok_or_else(|| "Cannot resolve {{remote}}: no upstream found".to_owned())?;

        result = result.replace("{{remote}}", remote);
    }

    if result.contains("{{defaultBranch}}") {
        let default_branch = context.default_branch.as_deref().ok_or_else(|| {
            "Cannot resolve {{defaultBranch}}: no default branch found for the chosen remote"
                .to_owned()
        })?;

        result = result.replace("{{defaultBranch}}", default_branch);
    }

    for (name, value) in &context.variables {
        let placeholder = format!("{{{{{name}}}}}");
        result = result.replace(&placeholder, value);
    }

    if let Some(variable) = find_unresolved_variable(&result) {
        return Err(format!(
            "Cannot resolve {{{{{variable}}}}}: variable not provided"
        ));
    }

    Ok(result)
}

pub fn resolve_arguments(args: &[String], context: &GitFlowContext) -> Result<Vec<String>, String> {
    args.iter()
        .map(|arg| resolve_argument(arg, context))
        .collect()
}
