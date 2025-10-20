// Test the invite API endpoint directly
const http = require('http')

async function testInviteAPI() {
  console.log('Testing /api/team/invite endpoint...\n')

  try {
    // Test data
    const testData = {
      email: 'test-member@example.com',
      role: 'member',
      organizationId: 'aebe832d-13cb-41b6-81f3-eeeeace2efdd', // From test-invitation.js
      userId: '34cd0004-3f5f-49d2-8266-90018ec460a6' // From test-invitation.js
    }

    console.log('Sending POST request to http://localhost:3001/api/team/invite')
    console.log('Request body:', JSON.stringify(testData, null, 2))
    console.log('')

    const postData = JSON.stringify(testData)

    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/team/invite',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }

    const req = http.request(options, (res) => {
      console.log('Response status:', res.statusCode)
      console.log('Response headers:', res.headers)
      console.log('')

      let body = ''
      res.on('data', (chunk) => {
        body += chunk
      })

      res.on('end', () => {
        try {
          const data = JSON.parse(body)
          console.log('Response body:', JSON.stringify(data, null, 2))

          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log('\n✅ Invitation API works!')
            console.log('Invite URL:', data.inviteUrl)
          } else {
            console.log('\n❌ Invitation API failed!')
            console.log('Error:', data.error)
          }
        } catch (e) {
          console.log('Response body (raw):', body)
          console.log('\n❌ Failed to parse JSON response')
        }
      })
    })

    req.on('error', (error) => {
      console.error('\n❌ Request error:', error.message)
    })

    req.write(postData)
    req.end()

  } catch (error) {
    console.error('\n❌ Error testing invite API:', error.message)
    console.error('Full error:', error)
  }
}

testInviteAPI()
