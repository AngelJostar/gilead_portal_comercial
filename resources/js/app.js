import './bootstrap';
import Alpine from 'alpinejs';

window.Alpine = Alpine;

const browserFetch = window.fetch.bind(window);
window.fetch = (input, options = {}) => {
    const requestUrl = new URL(typeof input === 'string' ? input : input.url, window.location.href);
    const method = (options.method || (typeof input === 'object' && input.method) || 'GET').toUpperCase();
    if (requestUrl.origin === window.location.origin && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
        const headers = new Headers(options.headers || (typeof input === 'object' ? input.headers : undefined));
        const token = document.querySelector('meta[name="csrf-token"]')?.content;
        if (token) headers.set('X-CSRF-TOKEN', token);
        headers.set('Accept', 'application/json');
        options = {...options, headers};
    }
    return browserFetch(input, options);
};

Alpine.start();
