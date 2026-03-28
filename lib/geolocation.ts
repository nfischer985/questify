export function getLocation(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('no geolocation')); return; }

    const timeout = setTimeout(async () => {
      try {
        const res = await fetch('https://ipapi.co/json/');
        const geo = await res.json();
        if (geo.latitude && geo.longitude) resolve({ lat: geo.latitude, lng: geo.longitude });
        else reject(new Error('ip geo failed'));
      } catch { reject(new Error('ip geo failed')); }
    }, 8000);

    navigator.geolocation.getCurrentPosition(
      pos => { clearTimeout(timeout); resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
      async () => {
        clearTimeout(timeout);
        try {
          const res = await fetch('https://ipapi.co/json/');
          const geo = await res.json();
          if (geo.latitude && geo.longitude) resolve({ lat: geo.latitude, lng: geo.longitude });
          else reject(new Error('ip geo failed'));
        } catch { reject(new Error('all geo failed')); }
      },
      { timeout: 7000 }
    );
  });
}
