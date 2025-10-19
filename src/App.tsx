import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

function App() {
  const [count, setCount] = useState(0)
  const [name, setName] = useState('')

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Flashpoint Studio</h1>
          <p className="text-muted-foreground">Built with Vite + React + Tailwind + shadcn/ui</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Counter Example</CardTitle>
              <CardDescription>Test the shadcn/ui button component</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-2xl font-bold text-center p-4 bg-secondary rounded-lg">
                Count: {count}
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setCount(count + 1)} className="flex-1">
                  Increment
                </Button>
                <Button onClick={() => setCount(count - 1)} variant="outline" className="flex-1">
                  Decrement
                </Button>
                <Button onClick={() => setCount(0)} variant="destructive">
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Input Example</CardTitle>
              <CardDescription>Test the shadcn/ui input component</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Enter your name..."
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              />
              {name && (
                <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                  <p className="text-sm font-medium">Hello, {name}!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Setup Complete!</CardTitle>
            <CardDescription>Your project is ready with the following:</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Vite 7.1.7 + React 19.1.1 + TypeScript 5.9.3</li>
              <li>Tailwind CSS 4.1.14 with Vite plugin</li>
              <li>shadcn/ui components (Button, Card, Input)</li>
              <li>Path aliases configured (@/ imports)</li>
              <li>Dark/Light mode CSS variables</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default App
