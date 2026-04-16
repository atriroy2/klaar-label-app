'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { X } from 'lucide-react'
import { employees, meetingPairs } from '@/lib/coaching/data'
import { Employee } from '@/lib/coaching/types'

interface TeamSetupProps {
  onStartSession: (manager: Employee, report: Employee) => void
}

export default function TeamSetup({ onStartSession }: TeamSetupProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null)
  const [selectedManager, setSelectedManager] = useState<Employee | null>(null)
  const [selectedReport, setSelectedReport] = useState<Employee | null>(null)

  const departments = ['Engineering', 'Sales', 'People & Ops', 'Leadership']

  const departmentColors: Record<string, { bg: string; text: string }> = {
    Engineering: { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-900 dark:text-blue-100' },
    Sales: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-900 dark:text-green-100' },
    'People & Ops': { bg: 'bg-purple-100 dark:bg-purple-900', text: 'text-purple-900 dark:text-purple-100' },
    Leadership: { bg: 'bg-amber-100 dark:bg-amber-900', text: 'text-amber-900 dark:text-amber-100' },
  }

  const avatarColorBg: Record<string, string> = {
    Engineering: 'bg-blue-500',
    Sales: 'bg-green-500',
    'People & Ops': 'bg-purple-500',
    Leadership: 'bg-amber-500',
  }

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesDept = !selectedDepartment || emp.department === selectedDepartment
      return matchesSearch && matchesDept
    })
  }, [searchQuery, selectedDepartment])

  const directReports = useMemo(() => {
    if (!selectedManager) return new Set()
    return new Set(employees.filter((emp) => emp.managerId === selectedManager.id).map((emp) => emp.id))
  }, [selectedManager])

  const handleEmployeeClick = (employee: Employee) => {
    if (!selectedManager) {
      setSelectedManager(employee)
    } else if (selectedManager.id !== employee.id) {
      setSelectedReport(employee)
    }
  }

  const handleClearSelection = (type: 'manager' | 'report') => {
    if (type === 'manager') {
      setSelectedManager(null)
      setSelectedReport(null)
    } else {
      setSelectedReport(null)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
  }

  const isValidPair = () => {
    if (!selectedManager || !selectedReport) return false
    return directReports.has(selectedReport.id)
  }

  return (
    <div className="space-y-6">
      {/* Selected Pair Card */}
      {(selectedManager || selectedReport) && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg">Selected Pair</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              {selectedManager && (
                <div className="flex items-center gap-3 flex-1">
                  <div className={`w-10 h-10 rounded-full ${avatarColorBg[selectedManager.department]} flex items-center justify-center text-white font-semibold text-sm`}>
                    {getInitials(selectedManager.name)}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{selectedManager.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedManager.role}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleClearSelection('manager')}
                    className="ml-auto"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {selectedManager && selectedReport && (
                <div className="text-muted-foreground text-sm font-semibold">→</div>
              )}

              {selectedReport && (
                <div className="flex items-center gap-3 flex-1">
                  <div className={`w-10 h-10 rounded-full ${avatarColorBg[selectedReport.department]} flex items-center justify-center text-white font-semibold text-sm`}>
                    {getInitials(selectedReport.name)}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{selectedReport.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedReport.role}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleClearSelection('report')}
                    className="ml-auto"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {selectedManager && selectedReport && !isValidPair() && (
              <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded text-sm text-amber-700 dark:text-amber-300">
                Note: {selectedReport.name} is not a direct report of {selectedManager.name}. This is a skip-level meeting.
              </div>
            )}

            {isValidPair() && selectedManager && selectedReport && (
              <Button
                onClick={() => onStartSession(selectedManager!, selectedReport!)}
                className="w-full mt-4"
              >
                Start Coaching Session
              </Button>
            )}

            {selectedManager && selectedReport && !isValidPair() && (
              <Button
                onClick={() => onStartSession(selectedManager!, selectedReport!)}
                className="w-full mt-4"
              >
                Start Skip-Level Session
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Search and Filter */}
      <div className="space-y-4">
        <Input
          placeholder="Search by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />

        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedDepartment === null ? 'default' : 'outline'}
            onClick={() => setSelectedDepartment(null)}
            className="rounded-full"
            size="sm"
          >
            All
          </Button>
          {departments.map((dept) => (
            <Button
              key={dept}
              variant={selectedDepartment === dept ? 'default' : 'outline'}
              onClick={() => setSelectedDepartment(dept)}
              className="rounded-full"
              size="sm"
            >
              {dept}
            </Button>
          ))}
        </div>
      </div>

      {/* Employee Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEmployees.map((employee) => {
          const isSelectedManager = selectedManager?.id === employee.id
          const isSelectedReport = selectedReport?.id === employee.id
          const isDirectReport = directReports.has(employee.id)
          const colors = departmentColors[employee.department]

          return (
            <button
              key={employee.id}
              onClick={() => handleEmployeeClick(employee)}
              className={`text-left transition-all rounded-lg border-2 p-4 ${
                isSelectedManager || isSelectedReport
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/50'
                  : isDirectReport && selectedManager
                  ? `border-primary/50 bg-primary/5 hover:border-primary/75`
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-12 h-12 rounded-full ${avatarColorBg[employee.department]} flex items-center justify-center text-white font-semibold text-sm flex-shrink-0`}>
                  {getInitials(employee.name)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-sm leading-tight">{employee.name}</p>
                    {isSelectedManager && <Badge variant="default" className="ml-auto text-xs">Manager</Badge>}
                    {isSelectedReport && <Badge variant="secondary" className="ml-auto text-xs">Report</Badge>}
                  </div>

                  <p className="text-xs text-muted-foreground mb-2">{employee.role}</p>

                  <div className="flex gap-1 flex-wrap">
                    <Badge variant="outline" className={`text-xs py-0 ${colors.bg} ${colors.text} border-0`}>
                      {employee.department}
                    </Badge>
                    {employee.reviewScore && (
                      <Badge variant="secondary" className="text-xs py-0">
                        {employee.reviewScore.toFixed(1)} ⭐
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {isDirectReport && selectedManager && !isSelectedReport && (
                <div className="mt-3 text-xs text-primary font-semibold">✓ Direct report</div>
              )}
            </button>
          )
        })}
      </div>

      {filteredEmployees.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">No employees found matching your search</p>
        </div>
      )}
    </div>
  )
}
