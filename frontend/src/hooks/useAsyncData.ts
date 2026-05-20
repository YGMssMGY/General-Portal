import { useEffect, useState, type DependencyList } from "react";

export interface AsyncDataState<T> {
    data?: T;
    error?: string;
    isLoading: boolean;
    refetch: () => void;
}

export function useAsyncData<T>(loader: () => Promise<T>, deps: DependencyList): AsyncDataState<T> {
    const [data, setData] = useState<T>();
    const [error, setError] = useState<string>();
    const [isLoading, setIsLoading] = useState(true);
    const [version, setVersion] = useState(0);

    useEffect(() => {
        let isMounted = true;
        setIsLoading(true);
        setError(undefined);

        loader()
            .then((result) => {
                if (isMounted) {
                    setData(result);
                }
            })
            .catch((unknownError: unknown) => {
                if (isMounted) {
                    const message =
                        unknownError instanceof Error
                            ? unknownError.message
                            : "Something went wrong";
                    setError(message);
                }
            })
            .finally(() => {
                if (isMounted) {
                    setIsLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [...deps, version]);

    return {
        data,
        error,
        isLoading,
        refetch: () => setVersion((current) => current + 1),
    };
}
