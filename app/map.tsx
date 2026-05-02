'use client'
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Map() {
  const searchParams = useSearchParams();
  const uni = searchParams.get('uni'); // VUT, UCT, Ingwe, etc
  
  const [institution, setInstitution] = useState<any>(null);
  const [allInstitutions, setAllInstitutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/data/knowledge.json')
    .then(res => res.json())
    .then(json => {
        const all = [
        ...json.institutions,
        ...(json.tvet_colleges || []),
        ...(json.private_institutions || [])
        ];
        setAllInstitutions(all);
        
        if (uni) {
          const found = all.find(i => 
            i.short?.toLowerCase() === uni.toLowerCase() || 
            i.name.toLowerCase() === uni.toLowerCase()
          );
          setInstitution(found);
        }
        setLoading(false);
      });
  }, [uni]);

  // Case 1: Loading JSON
  if (loading) return <div style={{ padding: '20px' }}>Loading...</div>;

  // Case 2: No?uni= param → show all 90
  if (!uni) {
    return (
      <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
        <h1 style={{ marginBottom: '8px' }}>Select a Campus</h1>
        <p style={{ color: '#666', marginBottom: '20px' }}>Choose from 90 SA institutions:</p>
        <div style={{ display: 'grid', gap: '10px', maxHeight: '70vh', overflowY: 'auto' }}>
          {allInstitutions.map(inst => (
            <Link 
              key={inst.name} 
              href={`/map?uni=${inst.short || inst.name}`}
              style={{ 
                padding: '12px', 
                border: '1px solid #ddd', 
                borderRadius: '8px',
                textDecoration: 'none',
                color: '#000',
                backgroundColor: '#fff'
              }}
            >
              <strong>{inst.short || inst.name}</strong><br/>
              <small style={{ color: '#666' }}>{inst.location}</small>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  // Case 3:?uni= set but not found
  if (!institution) return <div style={{ padding: '20px' }}>Campus "{uni}" not found. <Link href="/map">Back to list</Link></div>;

  // Case 4: Found the campus → show compass
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${institution.lng-0.008},${institution.lat-0.008},${institution.lng+0.008},${institution.lat+0.008}&layer=mapnik&marker=${institution.lat},${institution.lng}`;

  return (
    <div>
      <div style={{ backgroundColor: institution.primaryColor || '#8B0000', color: 'white', padding: '20px', textAlign: 'center' }}>
        <h1>{institution.short || institution.name} COMPASS</h1>
        <p>{institution.location}</p>
      </div>
      
      <iframe 
        src={mapUrl}
        style={{ width: '100%', height: '400px', border: 'none' }}
        title={`${institution.short} Campus Map`}
      />

      <div style={{ padding: '20px' }}>
        <a 
          href={`tel:${institution.security_phone || institution.contact}`}
          style={{ 
            display: 'block', 
            backgroundColor: institution.primaryColor || '#8B0000', 
            color: 'white', 
            padding: '15px', 
            textAlign: 'center',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 'bold'
          }}
        >
          📞 CALL CAMPUS SECURITY<br/>
          {institution.security_phone || institution.contact}
        </a>
        <Link href="/map" style={{ display: 'block', textAlign: 'center', marginTop: '12px' }}>← All Campuses</Link>
      </div>
    </div>
  );
}