import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { TimeScrollPicker } from "@/components/TimeScrollPicker";
import { useLanguage } from "@/contexts/LanguageContext";
import { ActivityFormRef, SolidsFormData, EditingData, getCurrentTime } from "./types";

const ALLERGENS = [
  { id: 'peanut', label: 'Peanut' },
  { id: 'egg', label: 'Egg' },
  { id: 'dairy', label: 'Dairy' },
  { id: 'wheat', label: 'Wheat' },
  { id: 'soy', label: 'Soy' },
  { id: 'tree-nuts', label: 'Tree nuts' },
  { id: 'sesame', label: 'Sesame' },
  { id: 'fish', label: 'Fish' },
  { id: 'shellfish', label: 'Shellfish' },
];

interface SolidsFormProps {
  editingData?: EditingData | null;
}

export const SolidsForm = forwardRef<ActivityFormRef, SolidsFormProps>(({
  editingData,
}, ref) => {
  const { t } = useLanguage();
  
  const [time, setTime] = useState(() => getCurrentTime());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [description, setDescription] = useState('');
  const [allergens, setAllergens] = useState<string[]>([]);

  // Load editing data
  useEffect(() => {
    if (editingData) {
      setTime(editingData.time);
      if (editingData.loggedAt) {
        setSelectedDate(new Date(editingData.loggedAt));
      }
      setDescription(editingData.details.solidDescription || '');
      setAllergens(editingData.details.allergens || []);
    }
  }, [editingData]);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    getValues: (): SolidsFormData => ({
      type: 'solids',
      time,
      selectedDate,
      description,
      allergens,
    }),
    validate: () => true, // Solids always valid
    reset: () => {
      setTime(getCurrentTime());
      setSelectedDate(new Date());
      setDescription('');
      setAllergens([]);
    },
  }));

  const toggleAllergen = (id: string, checked: boolean) => {
    if (checked) {
      setAllergens([...allergens, id]);
    } else {
      setAllergens(allergens.filter(a => a !== id));
    }
  };

  return (
    <div className="form-section">
      <TimeScrollPicker 
        value={time} 
        selectedDate={selectedDate}
        onChange={setTime} 
        onDateChange={setSelectedDate}
        label={t('time')} 
      />

      <div>
        <Label htmlFor="solids-description" className="form-label">Menu</Label>
        <Textarea
          id="solids-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Avocado toast, pureed pears..."
          rows={3}
          className="resize-none"
        />
      </div>

      <div>
        <Label className="form-label">Common allergens (optional)</Label>
        <div className="space-y-2">
          {ALLERGENS.map((allergen) => (
            <div key={allergen.id} className="flex items-center space-x-2">
              <Checkbox
                id={`allergen-${allergen.id}`}
                checked={allergens.includes(allergen.id)}
                onCheckedChange={(checked) => toggleAllergen(allergen.id, checked as boolean)}
              />
              <Label 
                htmlFor={`allergen-${allergen.id}`}
                className="text-sm font-normal cursor-pointer"
              >
                {allergen.label}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

SolidsForm.displayName = 'SolidsForm';
