
import { GoogleGenAI, Type } from "@google/genai";
import { DishSuggestion, RecipeDetail } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getDishSuggestions = async (
  ingredients: string[], 
  base64Image?: string, 
  excludeDishes: string[] = []
): Promise<DishSuggestion[]> => {
  const excludeText = excludeDishes.length > 0 ? ` DO NOT suggest any of these existing dishes: ${excludeDishes.join(', ')}.` : '';
  const prompt = `Based on these ingredients: ${ingredients.join(', ')}. Suggest 4 unique and delicious dishes I can cook.${excludeText} Focus on maximizing the use of these items. Provide output in JSON format.`;
  
  const contents: any[] = [{ text: prompt }];
  if (base64Image) {
    contents.unshift({
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64Image
      }
    });
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: contents,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            prepTime: { type: Type.STRING },
            difficulty: { type: Type.STRING, enum: ['Easy', 'Medium', 'Hard'] }
          },
          required: ['id', 'name', 'description', 'prepTime', 'difficulty']
        }
      }
    }
  });

  return JSON.parse(response.text || '[]');
};

export const getRecipeDetail = async (dish: DishSuggestion, allIngredients: string[]): Promise<RecipeDetail> => {
  const prompt = `Provide a detailed recipe for "${dish.name}". I have these ingredients: ${allIngredients.join(', ')}. 
  Include a YouTube search link for a tutorial of this specific dish. 
  CRITICAL: Identify common ingredients in this recipe and provide at least 2-3 smart substitutions for them. Explain the effect of each substitution (e.g., "Using tofu instead of chicken makes it vegan and softer in texture").
  The response should be JSON structured.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
          instructions: { type: Type.ARRAY, items: { type: Type.STRING } },
          tips: { type: Type.ARRAY, items: { type: Type.STRING } },
          youtubeSearchUrl: { type: Type.STRING },
          substitutions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                original: { type: Type.STRING },
                alternatives: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      effect: { type: Type.STRING }
                    },
                    required: ['name', 'effect']
                  }
                }
              },
              required: ['original', 'alternatives']
            }
          }
        },
        required: ['name', 'ingredients', 'instructions', 'tips', 'youtubeSearchUrl', 'substitutions']
      }
    }
  });

  const detail: RecipeDetail = JSON.parse(response.text || '{}');
  
  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (groundingChunks) {
    detail.sources = groundingChunks
      .filter((chunk: any) => chunk.web)
      .map((chunk: any) => ({
        title: chunk.web.title,
        uri: chunk.web.uri
      }));
  }

  return detail;
};
