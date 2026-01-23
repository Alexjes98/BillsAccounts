import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Person } from "@/api/api";
import { User } from "lucide-react";

interface PersonCardProps {
  person: Person;
}

export function PersonCard({ person }: PersonCardProps) {
  // Helper to get initials
  const getInitials = (name: string) => {
    const parts = name.split(" ");
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="flex flex-row items-center gap-4 pb-2">
        <Avatar className="h-12 w-12">
          <AvatarImage
            src={`https://ui-avatars.com/api/?name=${person.name}&background=random`}
            alt={person.name}
          />
          <AvatarFallback>{getInitials(person.name)}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <CardTitle className="text-lg">{person.name}</CardTitle>
          <p className="text-xs text-muted-foreground">
            Added on {new Date(person.created_at).toLocaleDateString()}
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="w-4 h-4" />
          <span>{person.contact_info || "No contact info saved"}</span>
        </div>
      </CardContent>
    </Card>
  );
}
