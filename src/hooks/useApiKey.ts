import { useEffect, useState } from 'react';

export function useApiKey() {
  const [apiKey, setApiKey] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlApiKey = urlParams.get('apiKey');

    if (urlApiKey) {
      localStorage.setItem('openai_api_key', urlApiKey);
      setApiKey(urlApiKey);

      const url = new URL(window.location.href);
      url.searchParams.delete('apiKey');
      window.history.replaceState({}, document.title, url.toString());
    } else {
      const storedKey = localStorage.getItem('openai_api_key');
      setApiKey(storedKey);
    }
  }, []);

  return apiKey;
}
