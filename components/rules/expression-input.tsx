'use client';

import { useEffect, useState, ReactNode } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { validateRuleExpression } from '@/lib/rules/validators';

interface ExpressionInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  label?: string | ReactNode;
  placeholder?: string;
  className?: string;
}

export function ExpressionInput({
  value,
  onChange,
  error: externalError,
  label = 'Rule Expression',
  placeholder = 'Enter rule expression (e.g., RSI(14) < 30)',
  className,
}: ExpressionInputProps) {
  const [validationError, setValidationError] = useState<string>('');
  const [isValid, setIsValid] = useState<boolean>(false);
  const [isTouched, setIsTouched] = useState<boolean>(false);

  useEffect(() => {
    if (!value || !isTouched) {
      setValidationError('');
      setIsValid(false);
      return;
    }

    const result = validateRuleExpression(value);
    if (result.isValid) {
      setValidationError('');
      setIsValid(true);
    } else {
      setValidationError(result.details || result.error || 'Invalid expression');
      setIsValid(false);
    }
  }, [value, isTouched]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setIsTouched(true);
    onChange(e.target.value);
  };

  const handleBlur = () => {
    setIsTouched(true);
  };

  const displayError = externalError || validationError;

  return (
    <div className={className}>
      <div className="space-y-2">
        <Label htmlFor="expression">{label}</Label>
        <Textarea
          id="expression"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={`font-mono text-sm ${
            displayError && isTouched ? 'border-red-500' : ''
          } ${isValid && isTouched ? 'border-green-500' : ''}`}
          rows={3}
        />

        {isTouched && isValid && !displayError && (
          <Alert variant="success" className="py-2">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Expression is valid
            </AlertDescription>
          </Alert>
        )}

        {isTouched && displayError && (
          <Alert variant="destructive" className="py-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {displayError}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
