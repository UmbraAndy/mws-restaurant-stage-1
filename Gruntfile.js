module.exports = function(grunt) {

    grunt.initConfig({
      responsive_images: {
        dev: {
          options: {
            sizes: [{
              name: '1x',
              width: '400',
              quality: 20
            },{
              name: '2x',
              width: '800',
              quality: 40
            }]
          },
          files: [{
            expand: true,
            src: ['*.{gif,jpg,png}'],
            cwd: 'img_src/',
            dest: 'img/'
          }]
        }
      },
    /* delte files in the img dir */
    clean: {
        dev: {
          src: ['img'],
        },
      },      
    });
  
    grunt.loadNpmTasks('grunt-responsive-images');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.registerTask('default', ['clean','responsive_images']);
  
  };