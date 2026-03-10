import fetch from 'node-fetch';

async function testFetch() {
  const token = 'YOUR_TOKEN_HERE'; // The user would have to enter this, but I can't.
  
  const res = await fetch('http://localhost:4000/api/journal', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // 'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ context_key: "test_network", content: "<p>test</p>" })
  });
  
  if (!res.ok) {
     const text = await res.text();
     console.error("Auth required or failed:", res.status, text);
  } else {
     const json = await res.json();
     console.log("Success:", json);
  }
}
testFetch();
