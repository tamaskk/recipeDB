import { useState, useEffect } from 'react';
import { Language, LANGUAGE_NAMES, getTextByLanguage, MultilingualText } from '@/types/recipe';

interface RecipeModalProps {
  recipe: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function RecipeModal({ recipe, isOpen, onClose }: RecipeModalProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('en');

  // Get available languages from recipe name
  const availableLanguages: Language[] = recipe?.name
    ? recipe.name.map((n: MultilingualText) => n.language).filter((lang: Language) => 
        ['en', 'de', 'nl', 'hu', 'fr', 'es', 'pt'].includes(lang)
      )
    : ['en'];

  useEffect(() => {
    // Set default language to first available or 'en'
    if (availableLanguages.length > 0 && !availableLanguages.includes(selectedLanguage)) {
      setSelectedLanguage(availableLanguages[0]);
    }
  }, [recipe]);

  if (!isOpen || !recipe) return null;

  const getText = (multilingualText: MultilingualText[] | undefined): string => {
    if (!multilingualText || multilingualText.length === 0) return '';
    return getTextByLanguage(multilingualText, selectedLanguage);
  };

  const formatTime = (minutes: number | undefined): string => {
    if (!minutes) return 'N/A';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl">
          {/* Header */}
          <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4 border-b border-gray-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold leading-6 text-gray-900 mb-4">
                  {getText(recipe.name) || 'Untitled Recipe'}
                </h3>
                
                {/* Language Selector */}
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">Language:</label>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value as Language)}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    {availableLanguages.map((lang) => (
                      <option key={lang} value={lang}>
                        {LANGUAGE_NAMES[lang]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="button"
                className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                onClick={onClose}
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 overflow-y-auto max-h-[calc(100vh-200px)]">
            <div className="space-y-6">
              {/* Image */}
              {recipe.imageUrl && (
                <div className="w-full">
                  <img
                    src={recipe.imageUrl}
                    alt={getText(recipe.name)}
                    className="w-full h-64 object-cover rounded-lg"
                  />
                </div>
              )}

              {/* Description */}
              {recipe.description && recipe.description.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Description</h4>
                  <p className="text-sm text-gray-700">{getText(recipe.description)}</p>
                </div>
              )}

              {/* Info */}
              {recipe.info && recipe.info.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Additional Information</h4>
                  <p className="text-sm text-gray-700">{getText(recipe.info)}</p>
                </div>
              )}

              {/* Recipe Details Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">Servings</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {recipe.servings || 'N/A'}
                    {recipe.servingsUnit && (
                      <span className="text-sm font-normal text-gray-600 ml-1">
                        {getText(recipe.servingsUnit)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">Difficulty</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {recipe.difficulty ? `${recipe.difficulty}/10` : 'N/A'}
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">Prep Time</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {formatTime(recipe.time?.prepMinutes)}
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">Cook Time</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {formatTime(recipe.time?.cookMinutes)}
                  </div>
                </div>
              </div>

              {/* Ingredients */}
              {recipe.ingredients && recipe.ingredients.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Ingredients</h4>
                  <ul className="space-y-2">
                    {recipe.ingredients.map((ingredient: any, index: number) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-gray-500 mt-1">•</span>
                        <span className="text-sm text-gray-700 flex-1">
                          {ingredient.amount > 0 && (
                            <span className="font-medium">{ingredient.amount} </span>
                          )}
                          {getText(ingredient.unit)} {getText(ingredient.name)}
                          {ingredient.isOptional && (
                            <span className="text-gray-500 italic ml-1">(optional)</span>
                          )}
                          {ingredient.notes && ingredient.notes.length > 0 && (
                            <span className="text-gray-500 text-xs ml-2">
                              - {getText(ingredient.notes)}
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Steps */}
              {recipe.steps && recipe.steps.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Instructions</h4>
                  <ol className="space-y-4">
                    {recipe.steps
                      .sort((a: any, b: any) => (a.stepNumber || 0) - (b.stepNumber || 0))
                      .map((step: any, index: number) => (
                        <li key={index} className="flex items-start space-x-3">
                          <span className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-sm font-semibold">
                            {step.stepNumber || index + 1}
                          </span>
                          <div className="flex-1">
                            <p className="text-sm text-gray-700">{getText(step.instructions)}</p>
                            {step.timeMinutes && (
                              <p className="text-xs text-gray-500 mt-1">
                                Time: {formatTime(step.timeMinutes)}
                              </p>
                            )}
                            {step.imageUrl && (
                              <img
                                src={step.imageUrl}
                                alt={`Step ${step.stepNumber || index + 1}`}
                                className="mt-2 w-full max-w-md rounded-lg"
                              />
                            )}
                          </div>
                        </li>
                      ))}
                  </ol>
                </div>
              )}

              {/* Nutritional Information */}
              {recipe.macros && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Nutritional Information</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {recipe.macros.calories > 0 && (
                      <div className="bg-gray-50 p-2 rounded">
                        <div className="text-xs text-gray-500">Calories</div>
                        <div className="text-sm font-semibold text-gray-900">
                          {recipe.macros.calories} kcal
                        </div>
                      </div>
                    )}
                    {recipe.macros.protein > 0 && (
                      <div className="bg-gray-50 p-2 rounded">
                        <div className="text-xs text-gray-500">Protein</div>
                        <div className="text-sm font-semibold text-gray-900">
                          {recipe.macros.protein}g
                        </div>
                      </div>
                    )}
                    {recipe.macros.carbohydrates > 0 && (
                      <div className="bg-gray-50 p-2 rounded">
                        <div className="text-xs text-gray-500">Carbs</div>
                        <div className="text-sm font-semibold text-gray-900">
                          {recipe.macros.carbohydrates}g
                        </div>
                      </div>
                    )}
                    {recipe.macros.fat > 0 && (
                      <div className="bg-gray-50 p-2 rounded">
                        <div className="text-xs text-gray-500">Fat</div>
                        <div className="text-sm font-semibold text-gray-900">
                          {recipe.macros.fat}g
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tags and Categories */}
              <div className="flex flex-wrap gap-2">
                {recipe.mealType && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                    {recipe.mealType}
                  </span>
                )}
                {recipe.cuisineType && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 capitalize">
                    {Array.isArray(recipe.cuisineType) 
                      ? recipe.cuisineType.join(', ') 
                      : recipe.cuisineType}
                  </span>
                )}
                {recipe.dietaryTags && recipe.dietaryTags.map((tag: string, index: number) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"
                  >
                    {tag}
                  </span>
                ))}
                {recipe.cookingMethods && recipe.cookingMethods.map((method: string, index: number) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 capitalize"
                  >
                    {method.replace('-', ' ')}
                  </span>
                ))}
              </div>

              {/* Recipe ID */}
              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 font-mono">ID: {recipe.id}</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className="inline-flex w-full justify-center rounded-md bg-purple-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-500 sm:ml-3 sm:w-auto"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

