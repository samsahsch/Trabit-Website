// Light/dark toggle. The choice is remembered per browser; without one the page follows the system setting.
// Fires a "themechange" event on document so pages can react (e.g. swap to dark screenshots).
(function () {
    var root = document.documentElement;
    var media = matchMedia('(prefers-color-scheme: dark)');
    function current() {
        return root.dataset.theme || (media.matches ? 'dark' : 'light');
    }
    function announce() {
        document.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
            b.setAttribute('aria-pressed', current() === 'dark' ? 'true' : 'false');
        });
        document.dispatchEvent(new CustomEvent('themechange', { detail: current() }));
    }
    document.querySelectorAll('[data-theme-toggle]').forEach(function (button) {
        button.addEventListener('click', function () {
            var next = current() === 'dark' ? 'light' : 'dark';
            root.dataset.theme = next;
            try { localStorage.setItem('theme', next); } catch (e) {}
            announce();
        });
    });
    if (media.addEventListener) media.addEventListener('change', announce);
    announce();
})();
