module.exports = function(grunt) {

    grunt.initConfig({
      responsive_images: {
        dev: {
          options: {
            sizes: [{
              name: '1x',
              width: '20%',
              suffix: '_1x',
              quality: 20
            },{
              name: 'large',
              width: '50%',
              suffix: '_2x',
              quality: 40
            }]
          },
          files: [{
            expand: true,
            src: ['*.{gif,jpg,png}'],
            cwd: 'img/',
            dest: 'images/'
          }]
        }
      },
    });
  
    grunt.loadNpmTasks('grunt-responsive-images');
    grunt.registerTask('default', ['responsive_images']);
  
  };