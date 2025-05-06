import { NextRequest, NextResponse } from 'next/server';
import { GenerateContentConfig, GoogleGenAI } from '@google/genai';
import { extractTextFromStream } from '@/app/utils/extractTextFromStream';
import { getSystemPrompt } from '../prompts';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const content = body.content;

    const config: GenerateContentConfig = {
        systemInstruction: {
          parts: [{
            text: getSystemPrompt()
          }]
        }
      };  

    const response = await ai.models.generateContentStream({
      model: 'gemini-2.0-flash',
      contents: content,
      config
    });

    const result = await extractTextFromStream(response);
    return NextResponse.json({ response: result });
  } catch (error) {
    console.error('Error calling AI service:', error);
    return NextResponse.json({ error: 'Failed to process request', details: error }, { status: 500 });
  }
}