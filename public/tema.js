// Aplica o tema guardado antes da primeira pintura, para a página não piscar de claro para escuro.
try {
  var tema = localStorage.getItem('viteme:tema')
  if (tema === 'claro' || tema === 'escuro') document.documentElement.setAttribute('data-tema', tema)
} catch (e) {}
