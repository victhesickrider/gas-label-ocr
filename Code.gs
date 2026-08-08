function doGet() {
  return ContentService
    .createTextOutput(HtmlService.createHtmlOutputFromFile("Index").getContent())
    .setMimeType(ContentService.MimeType.HTML);
}
