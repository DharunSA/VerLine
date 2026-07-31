import { useParams } from 'react-router-dom';
import { usePeopleStore } from '../../stores/peopleStore';
import MemberDrawer from '../../components/member/MemberDrawer';
import { useEffect } from 'react';
import { useUIStore } from '../../stores/uiStore';

export default function Person() {
  const { personId } = useParams<{ personId: string }>();
  const selectPerson = usePeopleStore(s => s.selectPerson);
  const openDrawer = useUIStore(s => s.openMemberDrawer);

  useEffect(() => {
    if (personId) {
      selectPerson(personId);
      openDrawer();
    }
  }, [personId, selectPerson, openDrawer]);

  return (
    <div style={{ height: '100%' }}>
      <MemberDrawer />
    </div>
  );
}
