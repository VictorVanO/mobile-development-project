import {
    addTask,
    deleteTask,
    getTasks,
    type SavedTask,
    type Task,
  } from "@/lib/task";
  import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
  import { Suspense, useState } from "react";
  import {
    Button,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    View,
  } from "react-native";
  
  export default function Index() {
    const [newTask, setNewTask] = useState("");
  
    const queryClient = useQueryClient();
  
    const { data: tasks, isLoading } = useQuery({
      queryFn: getTasks,
      queryKey: ["tasks"],
    });
  
    const addMutation = useMutation({
      mutationFn: (title: string) => addTask({ title, completed: false }),
      onMutate: async (title: string) => {
        title += ' (pending)'
        await queryClient.cancelQueries({ queryKey: ["tasks"] });
        queryClient.setQueryData(["tasks"], (old: Task[]) => [
          ...old,
          { id: 0, title, completed: false },
        ]);
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
      },
      onSuccess: () => {
        setNewTask("");
      },
    });
  
    const deleteMutation = useMutation({
      mutationFn: (id: number) => deleteTask(id),
      onMutate: async (id: number) => {
        await queryClient.cancelQueries({ queryKey: ["tasks"] });
        queryClient.setQueryData(["tasks"], (old: SavedTask[]) =>
          old.filter((t) => t.id !== id)
        );
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
      },
    });
  
    return (
      <View style={styles.container}>
        <View style={styles.inputContainer}>
          <TextInput
            value={newTask}
            onChangeText={setNewTask}
            placeholder="What needs to be done?"
            style={styles.input}
          />
          <Button title="Add" onPress={() => addMutation.mutate(newTask)} />
        </View>
        <FlatList
          refreshing={isLoading}
          onRefresh={() => {
            queryClient.invalidateQueries({ queryKey: ["todos"] });
          }}
          data={tasks}
          keyExtractor={(t) => String(t.id)}
          renderItem={({ item }) => (
            <View style={styles.taskContainer}>
              <Text style={styles.task}>{item.title}</Text>
              <Button
                title="Delete"
                onPress={() => deleteMutation.mutate(item.id)}
                color="red"
              />
            </View>
          )}
        />
      </View>
    );
  }
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "space-evenly",
      alignItems: "center",
    },
    inputContainer: {
      flexDirection: "row",
    },
    input: {
      borderWidth: 1,
    },
    taskContainer: {
      flexDirection: "row",
    },
    task: {
      padding: 10,
    },
  });