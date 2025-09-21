import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const lessonPrompt = `
You are an AI lesson generator for a personalized micro-learning platform. 
Generate a new lesson for a user based on their learning goals, current skill mastery, and preferred topic. 
The lesson must follow this simplified JSON format:

{
  "lessonId": "LESSON#<unique_id>",
  "userId": "<user_id>",
  "topic": "<lesson_topic>",
  "subTopics": ["<subtopic_1>", "<subtopic_2>"],
  "theories": [
    {"title": "<theory_title>", "content": "<theory_content>"}
  ],
  "quiz": {
    "isVisible": false,
    "attemptsMade": 0,
    "maxAttempts": 3,
    "question": "<quiz_question>",
    "options": ["<option1>", "<option2>", "<option3>"],
    "correctAnswer": <index_of_correct_option>,
    "difficulty": "<Easy/Medium/Hard>"
  },
  "durationMinutes": 5,
  "level": "<Beginner/Intermediate/Advanced>",
  "feedback": "",
  "createdAt": "<ISO_timestamp>"
}

Rules:
1. Generate 3 theories per lesson.
2. Theories should explain key concepts concisely (~5 min reading).
3. Include 1 quiz with 3 options; mark correct answer index 0-based.
4. Quiz hidden initially (isVisible: false).
5. Duration ≤ 5 min.
6. Lesson level matches user's current level.
7. Use user interests, skill gaps, or summaries to decide lesson topic.
8. Output only valid JSON, no extra text.
`;

export const handler = async (event) => {

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "OPTIONS,POST",
      },
      body: "",
    };
  }

  try {
    const bedrockRuntime = new BedrockRuntimeClient({ region: "us-east-1" });

    // Extract user info from event
    const { userId, currentLevel, skillGaps, interests, goals } = event;

    const fullPrompt = `${lessonPrompt}

Input Variables:
- userId: ${userId}
- currentLevel: ${currentLevel}
- skillGaps: ${JSON.stringify(skillGaps)}
- interests: ${JSON.stringify(interests)}
- goals: ${goals}

Generate the lesson now:`;

    // Nova Pro Messages API payload
    const payload = {
      messages: [
        {
          role: "user",
          content: [{ text: fullPrompt }]
        }
      ],
    };

    const response = await bedrockRuntime.send(
      new InvokeModelCommand({
        modelId: "arn:aws:bedrock:us-east-1:019076941004:inference-profile/us.amazon.nova-pro-v1:0",
        body: Buffer.from(JSON.stringify(payload)),
        contentType: "application/json",
        accept: "application/json"
      })
    );

    // Parse the model response
    const decoded = (new TextDecoder()).decode(response.body);
    const responseJson = JSON.parse(decoded);

    // Nova Pro structure: output.message[0].content[0].text
    const lessonText = responseJson.output.message.content?.[0]?.text;


    let lessonJson;
    try {
      lessonJson = JSON.parse(lessonText);
    } catch (parseError) {
      console.error("Failed to parse lesson JSON:", parseError);
      lessonJson = { error: "Invalid JSON format", rawContent: lessonText };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "OPTIONS,POST",
      },
      body: JSON.stringify(lessonJson),
    };

  } catch (error) {
    console.error("Handler error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: error.message,
        details: error.stack
      }),
    };
  }
};
