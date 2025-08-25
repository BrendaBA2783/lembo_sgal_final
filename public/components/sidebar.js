
// Lógica para el menú lateral desplegable reutilizable
window.initSidebar = function() {
	const sidebar = document.querySelector('.section__sidebar');
	const menu = document.getElementById('menu');
	const pageTitle = document.getElementById('sidebar-trigger');
	const pageImg = document.getElementById('sidebar-img-trigger');

	// Mostrar el menú
	function openSidebar() {
		if (sidebar) sidebar.classList.add('sidebar--open');
		if (menu) menu.classList.add('sidebar--open');
		document.body.classList.add('sidebar-active');
	}
	// Ocultar el menú
	function closeSidebar() {
		if (sidebar) sidebar.classList.remove('sidebar--open');
		if (menu) menu.classList.remove('sidebar--open');
		document.body.classList.remove('sidebar-active');
	}

	// Click en imagen o título
	if(pageTitle) pageTitle.addEventListener('click', openSidebar);
	if(pageImg) pageImg.addEventListener('click', openSidebar);

	// Click fuera del menú
	document.addEventListener('mousedown', function(e) {
		if (sidebar && !sidebar.contains(e.target) && (!pageTitle || !pageTitle.contains(e.target)) && (!pageImg || !pageImg.contains(e.target))) {
			closeSidebar();
		}
	});

	// Click en opción del menú
	if(menu) {
		menu.querySelectorAll('.section__nav').forEach(opt => {
			opt.addEventListener('click', function() {
				const text = this.querySelector('h2').textContent.trim();
				let href = '';
				switch(text) {
					case 'Perfil': href = '#'; break;
					case 'Dashboard': href = '#'; break;
					case 'Gestión de Usuarios': href = 'usuarios.html'; break;
					case 'Gestión de Cultivos': href = 'cultivos.html'; break;
					case 'Gestión de Ciclos': href = 'ciclos.html'; break;
					case 'Gestión de Insumos': href = 'insumos.html'; break;
					case 'Gestión de Sensores': href = 'sensores.html'; break;
					case 'Gestión de Producciones': href = 'producciones.html'; break;
					case 'Ajustes': href = '#'; break;
					case 'Cerrar sesión': href = 'login.html'; break;
				}
				closeSidebar();
				if(href && href !== '#') {
					window.location.href = href;
				}
			});
		});
	}
};
