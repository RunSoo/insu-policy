import { useState } from 'react';
import { DynamicFormConfig } from './AnalysisResult';
import { CheckCircle2 } from 'lucide-react';

interface DynamicFormRendererProps {
  config: DynamicFormConfig;
  onSubmit: (answers: Record<string, string | string[]>) => void;
}

export function DynamicFormRenderer({ config, onSubmit }: DynamicFormRendererProps) {
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});

  const handleChange = (fieldId: string, value: string | string[]) => {
    setAnswers(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = () => {
    onSubmit(answers);
  };

  const isFormValid = config.form_fields.every(field => {
    if (!field.required) return true;
    const val = answers[field.field_id];
    return val !== undefined && val !== '' && (Array.isArray(val) ? val.length > 0 : true);
  });

  return (
    <div className="bg-white border border-blue-100 rounded-2xl p-4 sm:p-6 md:p-8 shadow-xs">
      <div className="mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-gray-100 flex items-start gap-2.5 sm:gap-3">
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shrink-0 mt-0.5">
          <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <p className="text-sm sm:text-[15px] font-bold text-gray-800 leading-relaxed break-keep">
          {config.notice_message}
        </p>
      </div>

      <div className="space-y-5 sm:space-y-6">
        {config.form_fields.map(field => (
          <div key={field.field_id} className="space-y-2 sm:space-y-3">
            <label className="block text-xs sm:text-sm font-bold text-gray-700 break-keep">
              {field.label} {field.required && <span className="text-blue-500">*</span>}
            </label>

            {field.input_type === 'text' && (
              <input
                type="text"
                placeholder={field.placeholder}
                value={(answers[field.field_id] as string) || ''}
                onChange={(e) => handleChange(field.field_id, e.target.value)}
                className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors text-xs sm:text-sm break-keep"
              />
            )}

            {field.input_type === 'textarea' && (
              <textarea
                placeholder={field.placeholder}
                value={(answers[field.field_id] as string) || ''}
                onChange={(e) => handleChange(field.field_id, e.target.value)}
                rows={3}
                className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors text-xs sm:text-sm resize-none break-keep"
              />
            )}

            {field.input_type === 'radio' && field.options && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                {field.options.map(opt => (
                  <label 
                    key={opt} 
                    className={`flex items-center p-3 sm:p-4 border rounded-xl cursor-pointer transition-colors ${answers[field.field_id] === opt ? 'border-blue-500 bg-blue-50/30' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <input
                      type="radio"
                      name={field.field_id}
                      value={opt}
                      checked={answers[field.field_id] === opt}
                      onChange={() => handleChange(field.field_id, opt)}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 mt-0.5 shrink-0"
                    />
                    <span className="ml-2.5 sm:ml-3 text-xs sm:text-sm font-medium text-gray-700 break-keep leading-snug">{opt}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}

        <div className="pt-4 sm:pt-6">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isFormValid}
            className="w-full py-3.5 sm:py-4 rounded-xl font-bold text-white bg-[#0046FF] hover:bg-[#0038CC] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed shadow-xs text-sm sm:text-base break-keep"
          >
            답변 제출하기
          </button>
        </div>
      </div>
    </div>
  );
}
