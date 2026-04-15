UPDATE admin_credentials
SET email = 'ashleyjcarranza@gmail.com',
    password_hash = 'pbkdf2_sha256$100000$AqAnNcSjQ3Tg3iFFig2x2w$LhIFQFR8JJwRHLZPmU7OYQ54WzxsEdWmH0gjkJqgfFk',
    updated_at = CURRENT_TIMESTAMP
WHERE key = 'primary';
