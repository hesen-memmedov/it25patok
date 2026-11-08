import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { AlertTriangle, ClipboardList } from 'lucide-react'
import { Button, PageHeader } from '@/components/ui'
import { getData } from '@/lib/api'
import type { StudentSubject } from '@/lib/types'
import { AssignmentBrowser } from './AssignmentBrowser'

export default function StudentAssignmentsPage() {
  const subjects = useQuery({
    queryKey: ['student-subjects'],
    queryFn: () => getData<StudentSubject[]>('/student/subjects'),
  })

  return (
    <div className="page-container">
      <PageHeader
        eyebrow="Tələbə bölməsi"
        title="Tapşırıqlar"
        description="Qrupunuza təyin olunmuş bütün tapşırıqları fənn, tip və axtarış üzrə filterləyin."
        actions={
          <Link to="/student/missing">
            <Button variant="outline" leftIcon={<AlertTriangle className="h-4 w-4" />}>
              Borclarım
            </Button>
          </Link>
        }
      />
      <div className="mb-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <ClipboardList className="h-3.5 w-3.5" />
        Yalnız {subjects.data?.length ?? 0} fənn üzrə sizə aid tapşırıqlar göstərilir.
      </div>
      <AssignmentBrowser subjects={subjects.data} />
    </div>
  )
}
