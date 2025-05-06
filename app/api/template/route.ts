import { NextRequest, NextResponse } from 'next/server';
import { GenerateContentConfig, GoogleGenAI } from '@google/genai';
import { basePrompt as nodeBasePrompt } from '../defaults/node';
import { basePrompt as reactBasePrompt } from '../defaults/react';
import { BASE_PROMPT } from '../prompts';
import { extractTextFromStream } from '@/app/utils/extractTextFromStream';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = body.prompt;

    const config: GenerateContentConfig = {
      systemInstruction: {
        parts: [{
          text: "Return either node or react based on what you think this project should be. Only return a single word: 'node' or 'react'."
        }]
      }
    };

    const response = await ai.models.generateContentStream({
      model: "gemini-2.0-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        },
      ],
      config,
    });

    const answer = await extractTextFromStream(response);
    console.log("AI response:", answer);

    if (answer.trim().toLowerCase() !== 'react' && answer.trim().toLowerCase() !== 'node') {
      return NextResponse.json({ error: "Invalid response from AI. Expected 'node' or 'react'." }, { status: 403 });
    }

    const normalizedAnswer = answer.trim().toLowerCase();

    if (normalizedAnswer === "react") {
      return NextResponse.json({
        prompts: [BASE_PROMPT, `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${reactBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`],
        uiPrompts: [reactBasePrompt]
      });
    }

    if (normalizedAnswer === "node") {
      return NextResponse.json({
        prompts: [`Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${nodeBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`],
        uiPrompts: [nodeBasePrompt]
      });
    }
  } catch (error) {
    console.error("Error calling AI service:", error);
    return NextResponse.json({ error: "Failed to process request", details: error }, { status: 500 });
  }
}