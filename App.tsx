
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Layout } from './components/Layout';
import { AppState, Ingredient, DishSuggestion, RecipeDetail } from './types';
import { getDishSuggestions, getRecipeDetail } from './services/geminiService';

// --- Sub-components ---

const IngredientList: React.FC<{ 
  ingredients: Ingredient[]; 
  onRemove: (id: string) => void;
}> = ({ ingredients, onRemove }) => (
  <div className="flex flex-wrap gap-2 mb-4">
    {ingredients.map((ing) => (
      <span 
        key={ing.id} 
        className="px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-sm font-medium border border-orange-200 flex items-center animate-in fade-in slide-in-from-bottom-2 duration-300"
      >
        {ing.name}
        <button 
          onClick={() => onRemove(ing.id)}
          className="ml-2 hover:text-orange-900 focus:outline-none"
        >
          ×
        </button>
      </span>
    ))}
  </div>
);

const Loader: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex flex-col items-center justify-center py-20 space-y-6">
    <div className="relative">
      <div className="w-16 h-16 border-4 border-orange-100 border-t-orange-500 rounded-full animate-spin"></div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
      </div>
    </div>
    <p className="text-lg font-medium text-gray-600 animate-pulse">{message}</p>
  </div>
);

export default function App() {
  const [state, setState] = useState<AppState>('input');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<DishSuggestion[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasReachedEnd, setHasReachedEnd] = useState(false);

  const loaderRef = useRef<HTMLDivElement>(null);

  const addIngredient = useCallback(() => {
    if (!inputValue.trim()) return;
    setIngredients(prev => [...prev, { id: crypto.randomUUID(), name: inputValue.trim() }]);
    setInputValue('');
  }, [inputValue]);

  const removeIngredient = useCallback((id: string) => {
    setIngredients(prev => prev.filter(i => i.id !== id));
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const findDishes = async () => {
    if (ingredients.length === 0 && !capturedImage) {
      setError('Please add at least one ingredient or a photo.');
      return;
    }
    setError(null);
    setState('suggesting');
    setHasReachedEnd(false);
    try {
      const ingNames = ingredients.map(i => i.name);
      const base64 = capturedImage?.split(',')[1];
      const results = await getDishSuggestions(ingNames, base64);
      setSuggestions(results);
      setState('results');
    } catch (err) {
      setError('Failed to get suggestions. Please check your API key.');
      setState('input');
    }
  };

  const loadMoreSuggestions = useCallback(async () => {
    if (isFetchingMore || hasReachedEnd) return;
    setIsFetchingMore(true);
    try {
      const ingNames = ingredients.map(i => i.name);
      const base64 = capturedImage?.split(',')[1];
      const excludeNames = suggestions.map(s => s.name);
      const results = await getDishSuggestions(ingNames, base64, excludeNames);
      
      if (results.length === 0) {
        setHasReachedEnd(true);
      } else {
        setSuggestions(prev => [...prev, ...results]);
      }
    } catch (err) {
      console.error("Error loading more suggestions:", err);
    } finally {
      setIsFetchingMore(false);
    }
  }, [ingredients, capturedImage, suggestions, isFetchingMore, hasReachedEnd]);

  useEffect(() => {
    if (state !== 'results') return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        loadMoreSuggestions();
      }
    }, { threshold: 0.1 });

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => observer.disconnect();
  }, [state, loadMoreSuggestions]);

  const showRecipe = async (dish: DishSuggestion) => {
    setState('loading_recipe');
    try {
      const ingNames = ingredients.map(i => i.name);
      const detail = await getRecipeDetail(dish, ingNames);
      setSelectedRecipe(detail);
      setState('recipe');
    } catch (err) {
      setError('Failed to fetch recipe details.');
      setState('results');
    }
  };

  const reset = () => {
    setState('input');
    setSuggestions([]);
    setSelectedRecipe(null);
    setCapturedImage(null);
    setIngredients([]);
    setHasReachedEnd(false);
  };

  return (
    <Layout>
      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 flex items-center">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
          {error}
        </div>
      )}

      {state === 'input' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">What's in your kitchen?</h2>
            <p className="text-gray-500">Snap a photo of your pantry or list the items you have.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-gray-700">Add Ingredients</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addIngredient()}
                  placeholder="e.g. Chicken, Spinach, Pasta..."
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                />
                <button 
                  onClick={addIngredient}
                  className="px-6 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 active:scale-95 transition-all shadow-md shadow-orange-200"
                >
                  Add
                </button>
              </div>
              <IngredientList ingredients={ingredients} onRemove={removeIngredient} />
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-semibold text-gray-700">Snap a Photo (Optional)</label>
              <div className="relative group cursor-pointer">
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className={`aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-all ${capturedImage ? 'border-orange-500 bg-orange-50' : 'border-gray-200 bg-gray-50 group-hover:bg-gray-100'}`}>
                  {capturedImage ? (
                    <img src={capturedImage} alt="Captured" className="w-full h-full object-cover rounded-2xl" />
                  ) : (
                    <>
                      <svg className="w-12 h-12 text-gray-400 mb-2 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      <span className="text-gray-500 font-medium">Click to upload or take photo</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <button 
            disabled={ingredients.length === 0 && !capturedImage}
            onClick={findDishes}
            className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold text-lg hover:bg-black active:scale-[0.98] transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Find Recipe Suggestions
          </button>
        </div>
      )}

      {state === 'suggesting' && <Loader message="Analyzing your ingredients..." />}

      {state === 'results' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-800">Choose a Dish</h2>
            <button onClick={() => setState('input')} className="text-sm font-semibold text-orange-600 hover:underline">← Back to edit</button>
          </div>
          <div className="grid gap-6">
            {suggestions.map((dish, idx) => (
              <div 
                key={`${dish.id}-${idx}`} 
                className="group p-6 rounded-2xl border border-gray-100 bg-white hover:border-orange-200 hover:shadow-lg hover:shadow-orange-100/30 transition-all cursor-pointer"
                onClick={() => showRecipe(dish)}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-bold text-gray-800 group-hover:text-orange-600 transition-colors">{dish.name}</h3>
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 bg-gray-100 text-gray-500 rounded">{dish.difficulty}</span>
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 bg-orange-50 text-orange-600 rounded">{dish.prepTime}</span>
                  </div>
                </div>
                <p className="text-gray-600 leading-relaxed">{dish.description}</p>
                <div className="mt-4 flex items-center text-sm font-bold text-orange-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                  View Full Recipe →
                </div>
              </div>
            ))}
          </div>
          
          <div ref={loaderRef} className="py-8 text-center">
            {isFetchingMore ? (
              <div className="inline-flex items-center space-x-2 text-gray-400 animate-pulse">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-.15s]"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-.3s]"></div>
                <span className="text-sm font-medium">Finding more ideas...</span>
              </div>
            ) : hasReachedEnd ? (
              <p className="text-gray-400 text-sm">You've seen all our best ideas for now!</p>
            ) : (
              <p className="text-gray-300 text-sm italic">Scroll for more deliciousness...</p>
            )}
          </div>
        </div>
      )}

      {state === 'loading_recipe' && <Loader message="Cooking up the details..." />}

      {state === 'recipe' && selectedRecipe && (
        <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <button onClick={() => setState('results')} className="text-sm font-semibold text-gray-400 hover:text-gray-600 mb-2 block">← Back to suggestions</button>
              <h2 className="text-3xl font-extrabold text-gray-800">{selectedRecipe.name}</h2>
            </div>
            {selectedRecipe.youtubeSearchUrl && (
              <a 
                href={selectedRecipe.youtubeSearchUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-100"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
                Watch Video Tutorial
              </a>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            <div className="space-y-6">
              <div className="p-6 bg-orange-50 rounded-2xl border border-orange-100">
                <h3 className="text-lg font-bold text-orange-800 mb-4 flex items-center">
                   <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                  Ingredients
                </h3>
                <ul className="space-y-2">
                  {selectedRecipe.ingredients.map((ing, i) => (
                    <li key={i} className="text-orange-900 text-sm flex items-start">
                      <span className="mr-2">•</span> {ing}
                    </li>
                  ))}
                </ul>
              </div>

              {selectedRecipe.substitutions && selectedRecipe.substitutions.length > 0 && (
                <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <h3 className="text-lg font-bold text-emerald-800 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                    Smart Substitutions
                  </h3>
                  <div className="space-y-4">
                    {selectedRecipe.substitutions.map((sub, i) => (
                      <div key={i} className="space-y-1">
                        <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Instead of {sub.original}:</p>
                        {sub.alternatives.map((alt, j) => (
                          <div key={j} className="bg-white/50 p-2 rounded-lg text-xs text-emerald-900 border border-emerald-100/50">
                            <span className="font-bold">{alt.name}:</span> {alt.effect}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedRecipe.tips && selectedRecipe.tips.length > 0 && (
                <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100">
                  <h3 className="text-lg font-bold text-blue-800 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Pro Tips
                  </h3>
                  <ul className="space-y-2">
                    {selectedRecipe.tips.map((tip, i) => (
                      <li key={i} className="text-blue-900 text-sm italic">"{tip}"</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="md:col-span-2 space-y-8">
              <section>
                <h3 className="text-xl font-bold text-gray-800 mb-4">Steps to Prepare</h3>
                <div className="space-y-6">
                  {selectedRecipe.instructions.map((step, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-sm">
                        {i + 1}
                      </div>
                      <p className="text-gray-700 leading-relaxed pt-1">{step}</p>
                    </div>
                  ))}
                </div>
              </section>

              {selectedRecipe.sources && selectedRecipe.sources.length > 0 && (
                <section className="pt-8 border-t border-gray-100">
                   <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Sources & References</h4>
                   <div className="flex flex-wrap gap-3">
                     {selectedRecipe.sources.map((source, i) => (
                       <a 
                         key={i} 
                         href={source.uri} 
                         target="_blank" 
                         rel="noopener noreferrer"
                         className="text-xs text-gray-500 hover:text-orange-600 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 transition-colors"
                       >
                         {source.title}
                       </a>
                     ))}
                   </div>
                </section>
              )}

              <button 
                onClick={reset}
                className="mt-8 px-8 py-4 bg-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-200 transition-colors active:scale-95"
              >
                Start Over
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
