document.addEventListener('DOMContentLoaded', function() {
    const mobileMenu = document.getElementById('mobile-menu');
    const menuButton = document.getElementById('mobile-menu-button');
    const closeButton = document.getElementById('close-mobile-menu');
    const body = document.body;

    function openMenu() {
        mobileMenu.classList.remove('-translate-x-full');
        body.style.overflow = 'hidden';
    }

    function closeMenu() {
        mobileMenu.classList.add('-translate-x-full');
        body.style.overflow = '';
    }

    menuButton.addEventListener('click', openMenu);
    closeButton.addEventListener('click', closeMenu);

    // Close menu when clicking outside
    document.addEventListener('click', function(event) {
        const isClickInside = mobileMenu.contains(event.target) || menuButton.contains(event.target);
        if (!isClickInside && !mobileMenu.classList.contains('-translate-x-full')) {
            closeMenu();
        }
    });

    // Close menu on escape key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && !mobileMenu.classList.contains('-translate-x-full')) {
            closeMenu();
        }
    });
}); 