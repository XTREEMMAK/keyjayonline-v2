export function createIntersectionObserver(
    element, 
    callback, 
    options = {
        threshold: 0.1,
        rootMargin: '0px'
    }
) {
    if (typeof window === 'undefined') return;
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            callback(entry.isIntersecting, entry);
        });
    }, options);
    
    observer.observe(element);
    
    return () => observer.disconnect();
}