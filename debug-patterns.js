// Quick debug test for vulnerability detection
console.log('Testing vulnerability patterns...');

// Simulate the exact patterns being generated
const testPatterns = [
  "'; DROP TABLE users; --",
  '<script>alert("XSS")</script>',
  '../../../etc/passwd'
];

testPatterns.forEach(pattern => {
  const request = {
    url: '/api/vulnerable/sql',
    method: 'GET',
    headers: {},
    query: { 'query': pattern },
    body: null
  };

  const requestStr = JSON.stringify(request);
  console.log('Request string:', requestStr);
  console.log('Contains DROP TABLE:', requestStr.includes('DROP TABLE'));
  console.log('Contains <script>alert(:', requestStr.includes('<script>alert('));
  console.log('Contains ../../../etc/passwd:', requestStr.includes('../../../etc/passwd'));
  console.log('---');
});
