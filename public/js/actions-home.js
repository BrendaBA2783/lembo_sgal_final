
// Módulos y su información
const moduleData = {
	'mod-news': {
		title: '',
		content: `Aquí encontrarás las últimas noticias, actualizaciones y eventos importantes relacionados con la gestión agrícola de Lembo. Mantente informado sobre cambios, alertas y novedades del sistema.`
	},
	'mod-crop': {
		title: '',
		content: `Explora la información sobre los cultivos gestionados en el Lembo.`
	},
	'mod-about': {
		title: '',
		content: `Conoce la misión, visión y el compromiso con la innovación agrícola en Santa Rosa del LEMBO SGAL.`
	}
};

document.addEventListener('DOMContentLoaded', () => {
	const cards = document.querySelectorAll('.module-card');
	const infoContainer = document.getElementById('module-info');

	cards.forEach(card => {
		card.addEventListener('click', () => selectModule(card.id));
		card.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				selectModule(card.id);
			}
		});
	});

	function selectModule(selectedId) {
		cards.forEach(card => {
			if (card.id === selectedId) {
				card.classList.add('active');
				card.classList.remove('shrink');
			} else {
				card.classList.remove('active');
				card.classList.add('shrink');
			}
		});

		// Mostrar información
		if (moduleData[selectedId]) {
			infoContainer.innerHTML = `
				<h3>${moduleData[selectedId].title}</h3>
				<p>${moduleData[selectedId].content}</p>
				<button id="close-module-info" class="btn btn--secondary" style="margin-top:1rem;">Cerrar</button>
			`;
			infoContainer.classList.add('active');
			// Scroll al contenedor
			infoContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
			// Botón cerrar
			document.getElementById('close-module-info').onclick = () => {
				closeInfo();
			};
		}
	}

	function closeInfo() {
		cards.forEach(card => {
			card.classList.remove('active', 'shrink');
		});
		infoContainer.classList.remove('active');
		infoContainer.innerHTML = '';
	}
});
