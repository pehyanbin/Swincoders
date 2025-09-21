import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";


// Onboarding questions (for logging/reference)
const onboardingQuestions = [
  "Experience/Resume summary",
  "Skills/topics to focus on",
  "Skill gaps to fill",
  "Goals/areas to improve",
];

export const handler = async (event) => {
  // Handle preflight OPTIONS request for CORS
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
    const dynamo = new DynamoDBClient({ region: "ap-southeast-5" });

    // Parse POST body
    const { userId, answers, currentLevel } = event;

    if (!answers || answers.length !== 4) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Please provide all 4 answers" }),
      };
    }

    const prompt = `
You are an AI learning path generator for a personalized micro-learning platform. 
The employee has provided these answers:

1. Experience/Resume Summary: ${answers[0]}
2. Skills/Topics to focus on: ${answers[1]}
3. Skill gaps: ${answers[2]}
4. Goals to improve: ${answers[3]}

Generate a personalized learning path and the first lesson in this simplified JSON format:

{
  "lessonId": "LESSON#<unique_id>",
  "userId": "${userId}",
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
1. Generate 3 concise theories (~5 min reading).
2. Include 1 quiz with 3 options, correct index 0-based.
3. Quiz hidden initially.
4. Level matches employee current skill.
5. Use employee answers to decide topic.
6. Output ONLY valid JSON, no extra text.
`;

    const payload = {
      messages: [
        {
          role: "user",
          content: [{ text: prompt }]
        }
      ],
    };

    const response = await bedrockRuntime.send(
      new InvokeModelCommand({
        modelId: "arn:aws:bedrock:us-east-1:019076941004:inference-profile/us.amazon.nova-pro-v1:0",
        body: Buffer.from(JSON.stringify(payload)),
        contentType: "application/json",
        accept: "application/json",
      })
    );

    const decoded = (new TextDecoder()).decode(response.body);
    const responseJson = JSON.parse(decoded);

    // Nova Pro structure: output.message[0].content[0].text
    const lessonText = responseJson.output?.message?.content?.[0]?.text;

    let lessonJson;
    try {
      lessonJson = JSON.parse(lessonText);
      console.log("Generated lesson:", lessonJson);
    } catch (parseError) {
      console.error("Failed to parse lesson JSON:", parseError);
      lessonJson = { error: "Invalid JSON format", rawContent: lessonText };
    }

    // ✅ Add `done: false` before saving
    lessonJson.done = false;

    // ✅ Save to DynamoDB
    await dynamo.send(new PutItemCommand({
      TableName: "lesson",
      Item: {
        lessonID: { S: Math.round(Math.random() * 999999999) + "a" },
        employeeID: { S: `USER#${lessonJson.userId}` },
        topic: { S: lessonJson.topic },
        subTopics: { S: JSON.stringify(lessonJson.subTopics) },
        theories: { S: JSON.stringify(lessonJson.theories) },
        quiz: { S: JSON.stringify(lessonJson.quiz) },
        durationMinutes: { N: lessonJson.durationMinutes.toString() },
        level: { S: lessonJson.level },
        feedback: { S: lessonJson.feedback ?? "" },
        createdAt: { S: lessonJson.createdAt },
        done: { BOOL: false }
      },
    }));

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "OPTIONS,POST",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Lesson generated and saved successfully",
        lesson: lessonJson,
      }),
    };

  } catch (error) {
    console.error("Handler error:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "OPTIONS,POST",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error: error.message,
        details: error.stack,
      }),
    };
  }
};
