'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class SettingsErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Settings Error Boundary]', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <Card className='mx-auto mt-8 max-w-md border-destructive/50'>
          <CardHeader>
            <div className='flex items-center gap-2'>
              <AlertTriangle className='h-5 w-5 text-destructive' />
              <CardTitle className='text-lg'>Settings Error</CardTitle>
            </div>
            <CardDescription>
              Something went wrong loading the settings module.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <p className='text-sm text-muted-foreground'>
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <Button
              variant='outline'
              size='sm'
              onClick={() => this.setState({ hasError: false, error: undefined })}
            >
              <RefreshCw className='mr-2 h-4 w-4' />
              Try Again
            </Button>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}
