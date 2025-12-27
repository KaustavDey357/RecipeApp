
export interface Ingredient {
  id: string;
  name: string;
}

export interface DishSuggestion {
  id: string;
  name: string;
  description: string;
  prepTime: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export interface Substitution {
  original: string;
  alternatives: Array<{
    name: string;
    effect: string;
  }>;
}

export interface RecipeDetail {
  name: string;
  ingredients: string[];
  instructions: string[];
  tips: string[];
  substitutions: Substitution[];
  youtubeSearchUrl?: string;
  sources?: Array<{
    title: string;
    uri: string;
  }>;
}

export type AppState = 'input' | 'suggesting' | 'results' | 'loading_recipe' | 'recipe';
