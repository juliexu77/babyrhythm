import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { TimeScrollPicker } from "@/components/TimeScrollPicker";
import { useLanguage } from "@/contexts/LanguageContext";

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
  time: string;
  setTime: (time: string) => void;
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  description: string;
  setDescription: (desc: string) => void;
  allergens: string[];
  setAllergens: (allergens: string[]) => void;
}

export const SolidsForm = ({
  time,
  setTime,
  selectedDate,
  setSelectedDate,
  description,
  setDescription,
  allergens,
  setAllergens,
}: SolidsFormProps) => {
  const { t } = useLanguage();

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
};
