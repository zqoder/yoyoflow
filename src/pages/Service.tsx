import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useServiceStore, AVAILABLE_MODELS } from "@/store/services";

export default function Service() {
  const { services, updateService } = useServiceStore();

  return (
    <div className="grid gap-4 p-4 grid-cols-1">
      {services.map((service) => (
        <Card key={service.id}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">
              {service.name}
            </CardTitle>
            <Switch
              checked={service.enabled}
              onCheckedChange={(checked) =>
                updateService(service.id, "enabled", checked)
              }
            />
          </CardHeader>
          <CardFooter className="pt-6 flex-col gap-4 items-start">
            <div className="flex w-full items-center gap-4">
              <Label htmlFor={`model-${service.id}`} className="w-20 shrink-0">
                Model
              </Label>
              <Select
                value={service.model}
                onValueChange={(value) =>
                  updateService(service.id, "model", value)
                }
              >
                <SelectTrigger id={`model-${service.id}`} className="w-full">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_MODELS[service.id]?.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex w-full items-center gap-4">
              <Label
                htmlFor={`api-key-${service.id}`}
                className="w-20 shrink-0"
              >
                API Key
              </Label>
              <PasswordInput
                id={`api-key-${service.id}`}
                placeholder={`Enter ${service.name} API Key`}
                value={service.apiKey}
                onChange={(e) =>
                  updateService(service.id, "apiKey", e.target.value)
                }
              />
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
