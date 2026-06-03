const ERP_WEBHOOK_URL = 'https://itklklsotsybsqntyrzr.supabase.co/functions/v1/google-form-leads';
const SOURCE_ID = 'REEMPLAZAR_SOURCE_ID';
const API_KEY = 'REEMPLAZAR_API_KEY';

function onFormSubmit(e) {
  const fields = {};

  Object.keys(e.namedValues || {}).forEach((key) => {
    const value = e.namedValues[key];
    fields[key] = Array.isArray(value) ? value.join(' ') : value;
  });

  const payload = {
    source_id: SOURCE_ID,
    api_key: API_KEY,
    fields,
  };

  UrlFetchApp.fetch(ERP_WEBHOOK_URL, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
}
