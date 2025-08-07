import axios from "axios";

async function testAskEndpoint() {
  try {
    const response = await axios.post("http://localhost:3000/api/ask", {
      prompt: "What are the top universities in India?"
    });
    console.log("Response:", response.data);
  } catch (error) {
    if (error.response) {
      console.error("Error response:", error.response.data);
    } else {
      console.error("Error:", error.message);
    }
  }
}

testAskEndpoint();
