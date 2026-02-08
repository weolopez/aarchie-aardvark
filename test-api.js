const apiKey = "AIzaSyDtVOxqxc--DiwDNaADtIs5RRk3N4jc9g8";
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;

const requestBody = {
  contents: [
    {
      parts: [{ text: "Say hello in one word." }],
      role: "user"
    }
  ],
  generationConfig: {
    temperature: 0.7,
    maxOutputTokens: 4096
  }
};

fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(requestBody)
})
.then(response => response.json())
.then(data => console.log('Response:', JSON.stringify(data, null, 2)))
.catch(error => console.error('Error:', error));