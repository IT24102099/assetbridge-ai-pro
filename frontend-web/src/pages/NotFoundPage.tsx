import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { HelpCircle, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="max-w-md border-border/60 bg-card/60 backdrop-blur-md text-center p-6 space-y-4">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground mx-auto">
          <HelpCircle className="h-6 w-6" />
        </div>
        <CardHeader className="p-0 space-y-1">
          <CardTitle className="text-xl text-foreground">Page Not Found</CardTitle>
          <CardDescription className="text-xs">
            The requested screen does not exist or has moved.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 pt-2">
          <Button variant="brand" size="sm" onClick={() => navigate('/dashboard')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
