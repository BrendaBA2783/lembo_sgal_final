// Funciones para manejar el modal de "Olvide mi Gmail" y "Olvide mi Contraseña"
function openForgotModal() {
    document.getElementById('forgotModal').style.display = 'block';
}

function closeForgotModal() {
    document.getElementById('forgotModal').style.display = 'none';
    // Limpiar el formulario y ocultar la alerta
    document.getElementById('forgotForm').reset();
    document.getElementById('successAlert').style.display = 'none';
}

// Cerrar modal al hacer clic fuera de él
window.onclick = function(event) {
    const modal = document.getElementById('forgotModal');
    if (event.target === modal) {
        closeForgotModal();
    }
}

// Manejar el envío del formulario
document.getElementById('forgotForm').addEventListener('submit', function(e) {
    e.preventDefault();
            
    // Obtener los valores del formulario
    const fullName = document.getElementById('fullName').value;
    const documentNumber = document.getElementById('documentNumber').value;
            
    if (fullName && documentNumber) {
        // Mostrar la alerta de éxito
        const alert = document.getElementById('successAlert');
        alert.style.display = 'block';
                
        // Deshabilitar el botón de enviar
        const submitBtn = document.querySelector('.modal__btn-submit');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Enviado';
                
        // Redirigir al home después de 3 segundos
        setTimeout(function() {
            window.location.href = '../index.html';
        }, 4000);
    }
});