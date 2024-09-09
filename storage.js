// 
{/* class for handling local storage (AsyncStorage) functions */}

import AsyncStorage from '@react-native-community/async-storage'; 

  // convert comma separated string to set datatype
const stringToSet = (str) => {
  if (str != null) {
    return new Set(str.split(","));
  } else {
    return new Set();
  }
}

// convert set datatype to comma separated string
const setToString = (inputSet) => {
  return Array.from(inputSet).join(",");
}

// check if specific artwork is saved as favourite of not
export const isSavedFavourite = async (artID) => {
  let favStr =　await getAllFavourites(); // retireve artIds saved as favourite
  let favSet = stringToSet(favStr); // convert to set in order to manipulate list

  if(favSet.has(artID)) {
    return 'true';
  } else {
    return 'false';
  }
}

// toggle true/false of favourite setting of an artwork
export const toggleFavourite = async (artID) => {

  let newData = '';
  let favStr =　await getAllFavourites(); // retireve artIds saved as favourite
  let favSet = stringToSet(favStr); // convert to set in order to manipulate list
  let isFav = '';

  // toggle favourite
  if(favSet.has(artID)) {
    // if artID is already in favourites, remove
    favSet.delete(artID);
    alert("removed from favourites")
    isFav =  'false';
  } else {
    // if artID is not in favourites, add
    favSet.add(artID);
    alert("added to favourites");
    isFav =  'true';
  }

  newData = setToString(favSet); // convert to string in order to save repo

  try {
    await AsyncStorage.setItem(
      'favourites',
      newData
    );
    return isFav;
  } catch (error) {
    console.log(error);
  }
}

  // get all artworkds saved as favourite
  export const getAllFavourites = async () => {
    let favIDs = [];

    try {
      favIDs = await AsyncStorage.getItem('favourites');
    } catch (error) {
      console.log(error);
    }
    return favIDs;
  }

// get all artworkds saved with user tasks
export const getArtIDsWithTasks = async () => {
  let allKeys = []; // store all keys in storage
  let artIDs = []; // store all artIds saved as favourite

  try {
    allKeys = await AsyncStorage.getAllKeys();
    
  } catch (error) {
    console.log(error);
  }

  // resolve expo snack bug: randomly inserts keys in string such as '__react_native_storage_test', 'EXPO_CONSTANTS_INSTALLATION_ID'
  artIDs = allKeys.filter(Number);

  if (artIDs.length > 0) {
    artIDs = artIDs.toString();
  } else {
    artIDs = null;
  }
  return artIDs;
}

// get all tasks for specific artwork
export const getTasksByArtID = async (artID) => {
  let userTasks = [];

  // retreive task data from repository

  userTasks = await AsyncStorage.getItem(artID);

  if(userTasks) {
    // if tasks exist, convert into object
    userTasks = JSON.parse(userTasks);  

    await Promise.all(userTasks.map(async task => {
      task.isCompleted = await isTaskCompleted(task.taskID);
      //console.log(task.isCompleted);
    }));

  } else {
    // if no tasks saved yet, return null
    userTasks = null;
  }

  return userTasks;
}


// get all completed tasks
export const getAllCompletedTasks = async () => {
  let tasks = [];

  try {
    tasks = await AsyncStorage.getItem('completed');
  } catch (error) {
    console.log(error);
  }
  return tasks;
}

// mark task as completed
export const markTaskCompleted = async (taskID) => {
  let newData = '';
  let taskStr = await getAllCompletedTasks();
  let taskSet = stringToSet(taskStr);

  taskSet.add(taskID);
  newData = setToString(taskSet);

  try {
    await AsyncStorage.setItem(
      'completed',
      newData
    );
  } catch (error) {
    console.log(error);
  }
}

// check if task completed or not
export const isTaskCompleted = async (taskID) => {
  let compTaskStr = await getAllCompletedTasks();
  let compTaskSet = stringToSet(compTaskStr);

  if(compTaskSet.has(taskID)) {
    return 'true';
  } else {
    return 'false';
  }
}

// save new user task
export const addTask = async (artID, taskID, text, dueDate) => {

  let newTask = {
    'taskID': taskID,
    'text' : text,
    'dueDate' : dueDate,
  }

  let tasks = await getTasksByArtID(artID);

  if (tasks != null) {
    tasks.push(newTask);
  } else {
    tasks = [newTask];
  }

  try {
    await AsyncStorage.setItem(
      artID,
      JSON.stringify(tasks)
    );
    alert('Task added!');
  } catch (error) {
    console.log(error);
  }
  return await getTasksByArtID(artID);
}

// delete chosen task
export const deleteTask = async (artID, targetTaskID) => {

  // get all tasks for specific artwork
  let tasks = await getTasksByArtID(artID);

  if (tasks != null) {

    // delete from completed tasks list first
    deleteCompTask(targetTaskID);

    // if there are other tasks fot this artwork, just remove deleting task.
    if (tasks.length > 1) {
      
      tasks = tasks.filter(({ taskID }) => taskID !== targetTaskID);
              
      try {
        await AsyncStorage.setItem(
          artID,
          JSON.stringify(tasks)
        );
      } catch (error) {
        console.log(error);
      }
      return tasks;
    } else {
      // if deleting task is the only task for this artwork, remove artwork ID from storage
      try {
        await AsyncStorage.removeItem(artID);
      } catch (error) {
        console.log(error);
      }       
    }
  }
}

// remove task from completed task list
const deleteCompTask = async (taskID) => {
  let compTasks = stringToSet(await getAllCompletedTasks());
  let newData = '';

  compTasks.delete(taskID);

  try {
    await AsyncStorage.setItem(
      'completed',
      newData
    );
  } catch (error) {
    console.log(error);
  }
}

