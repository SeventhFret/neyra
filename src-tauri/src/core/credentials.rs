const SERVICE_NAME: &str = "Neyra";

pub fn set_token(account: &str, token: &str) -> Result<(), keyring::Error> {
    let entry = keyring::Entry::new(SERVICE_NAME, account)?;

    entry.set_password(token)
}

pub fn get_token(account: &str) -> Result<String, keyring::Error> {
    let entry = keyring::Entry::new(SERVICE_NAME, account)?;

    entry.get_password()
}

pub fn delete_token(account: &str) -> Result<(), keyring::Error> {
    let entry = keyring::Entry::new(SERVICE_NAME, account)?;

    entry.delete_credential()
}
