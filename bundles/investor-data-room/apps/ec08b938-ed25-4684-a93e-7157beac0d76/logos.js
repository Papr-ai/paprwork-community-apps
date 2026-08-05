// Company Logo — loaded from config or DB
// Users set their logo via chat: "Set my company logo to [SVG or URL]"
// The DB stores logo SVGs in config table (company_logo_dark, company_logo_light)
(function(){
  // Check if logos were loaded from DB (db-queries.js sets these)
  if (!window.COMPANY_LOGO_DARK) {
    // Fallback: show company name as text logo
    var name = (window.ROOM_DATA && window.ROOM_DATA.company && window.ROOM_DATA.company.name) || 'Your Company';
    var textLogo = '<span style="font-weight:700;font-size:22px;letter-spacing:-0.5px">' + name + '</span>';
    window.COMPANY_LOGO_DARK = textLogo;
    window.COMPANY_LOGO_LIGHT = '<span style="font-weight:700;font-size:22px;letter-spacing:-0.5px;color:#14161a">' + name + '</span>';
  }
})();
