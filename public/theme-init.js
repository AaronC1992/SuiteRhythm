(function(){
  try {
    var root = document.documentElement;
    var theme = localStorage.getItem('SuiteRhythm_theme') || 'dark';
    var palette = localStorage.getItem('SuiteRhythm_palette');
    var look = localStorage.getItem('SuiteRhythm_look') || 'classic';
    root.setAttribute('data-theme', theme);
    if (palette) root.setAttribute('data-color-palette', palette);
    root.setAttribute('data-look', look);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.setAttribute('data-look', 'classic');
  }
}());
