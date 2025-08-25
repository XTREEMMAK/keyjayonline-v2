import { onMount } from 'svelte';

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

export function useIntersectionObserver(options = {}) {
    let elements = new Map();
    
    onMount(() => {
        if (typeof window === 'undefined') return;
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const callback = elements.get(entry.target);
                if (callback) {
                    callback(entry.isIntersecting, entry);
                }
            });
        }, {
            threshold: options.threshold || 0.1,
            rootMargin: options.rootMargin || '0px'
        });
        
        return () => {
            elements.forEach((_, element) => {
                observer.unobserve(element);
            });
            observer.disconnect();
        };
    });
    
    return {
        observe: (element, callback) => {
            if (!element) return;
            elements.set(element, callback);
            
            if (typeof window !== 'undefined') {
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        callback(entry.isIntersecting, entry);
                    });
                }, {
                    threshold: options.threshold || 0.1,
                    rootMargin: options.rootMargin || '0px'
                });
                
                observer.observe(element);
                
                return () => observer.disconnect();
            }
        }
    };
}