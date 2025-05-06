/* eslint-disable @typescript-eslint/no-explicit-any */
export async function extractTextFromStream(stream: AsyncIterable<any>): Promise<string> {
    let text = "";
    for await (const chunk of stream) {
        const part = chunk.candidates?.[0]?.content?.parts?.[0]?.text;
        if (part) text += part;
    }
    return text;
}